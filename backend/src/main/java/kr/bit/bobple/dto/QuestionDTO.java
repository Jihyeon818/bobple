package kr.bit.bobple.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class QuestionDTO {
    private Long queIdx;
    private Long userIdx; // Add userId here
    private String userName;
    private String queTitle;
    private String queDescription;
    private LocalDateTime createdAt;
    private Boolean status;
    private List<AnswerDTO> answers; // 답변 포함


    public QuestionDTO(Long queIdx, String userName, String queTitle, String queDescription, LocalDateTime createdAt, Boolean status) {
        this.queIdx = queIdx;
        this.userName = userName;
        this.queTitle = queTitle;
        this.queDescription = queDescription;
        this.createdAt = createdAt;
        this.status = status;
    }


    // Getters and Setters
}


